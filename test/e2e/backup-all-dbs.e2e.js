#!/usr/bin/env node
/**
 * 真實瀏覽器 e2e — 「備份所有資料」涵蓋所有 DB (v2.3.2.147)
 *
 * 驗證:
 *   ① 匯出涵蓋 localStorage 全部 + 3 個 IndexedDB
 *      (wrongNoteImgDB / mockExamImgDB / mockExamReviewDB)
 *   ② 還原後每個 DB 的資料都回來
 *   ③ ★ 欄位完整保留 (mockExamReviewDB 的 examId / slot / name 不能掉)
 *   ④ 一鍵 backupEverything() 可用
 */
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
let PORT = 0, CDP = 0;
const NOTES_KEY = 'myStudyNotes';
const WN_DB = 'wrongNoteImgDB';
const ME_DB = 'mockExamImgDB';
const MR_DB = 'mockExamReviewDB';
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function findChrome() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
    for (const c of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser']) {
        if (fs.existsSync(c)) return c;
    }
    return null;
}
const CHROME = findChrome();
if (!CHROME) { console.error('❌ 找不到 Chrome'); process.exit(2); }

const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css' };
const server = http.createServer((q,r)=>{
    let p=q.url.split('?')[0]; if(p==='/')p='/index.html';
    const f=path.join(ROOT,p);
    if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
    r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});
    r.end(fs.readFileSync(f));
});
let msgId=0; const pending=new Map(); let ws;
function send(m,p={},s){const id=++msgId;ws.send(JSON.stringify({id,method:m,params:p,...(s?{sessionId:s}:{})}));
 return new Promise((res,rej)=>pending.set(id,{res,rej}));}
let pass=0, fail=0;
function ok(c,n,e){if(c){pass++;console.log('  ✅ '+n);}else{fail++;console.log('  ❌ '+n+(e?'  → '+e:''));}}

(async () => {
    await new Promise(r=>server.listen(0,'127.0.0.1',r)); PORT=server.address().port;
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),'lpb-bdb-'));
    const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage',
        '--remote-debugging-port=0',`--user-data-dir=${profile}`,'--remote-allow-origins=*','about:blank'],{stdio:'ignore'});
    let ver=null;
    for(let i=0;i<120;i++){
        const pf=path.join(profile,'DevToolsActivePort');
        if(fs.existsSync(pf)){
            const port=parseInt(fs.readFileSync(pf,'utf8').split('\n')[0].trim(),10);
            if(port>0){try{ver=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();break;}catch(e){}}
        }
        await new Promise(r=>setTimeout(r,250));
    }
    if(!ver){console.error('❌ Chrome 啟動失敗');process.exit(1);}
    ws=new WebSocket(ver.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r));
    const logs=[];
    ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
        if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);
            m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
        if(m.method==='Runtime.consoleAPICalled'){const t=(m.params.args||[]).map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' ');logs.push(m.params.type+'| '+t);}
        if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;logs.push('EXCEPTION| '+(d.exception?.description||d.text));}});
    const r=await send('Target.createTarget',{url:'about:blank'}); const tid=r.targetId;
    const a=await send('Target.attachToTarget',{targetId:tid,flatten:true}); const sid=a.sessionId;
    await send('Page.enable',{},sid); await send('Runtime.enable',{},sid);
    const ev=async x=>{const rr=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},sid);
        if(rr.exceptionDetails)return{__err:rr.exceptionDetails.exception?.description||rr.exceptionDetails.text};return rr.result.value;};
    await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/index.html?e2e=${Date.now()}`},sid);
    for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,250));
        const rd=await ev("(function(){var t=document.getElementById('master-health-text');return !!(t&&(t.textContent||'').indexOf('檢查中')===-1);})()");
        if(rd)break;}

    console.log('\n▶ 步驟 1: 造 3 個 DB 的資料');
    const seeded = await ev(`(async function(){
      try {
        function openDB(name, store, idx){
          return new Promise(function(res,rej){var q=indexedDB.open(name,1);
            q.onupgradeneeded=function(e){var d=e.target.result;
              if(!d.objectStoreNames.contains(store)){var st=d.createObjectStore(store,{keyPath:'id'});
                Object.keys(idx||{}).forEach(function(k){ try{st.createIndex(k,k,{unique:false});}catch(x){} });}};
            q.onsuccess=function(e){res(e.target.result);};q.onerror=function(){rej();};});
        }
        function put(db,store,rec){return new Promise(function(res){
          var tx=db.transaction([store],'readwrite');tx.objectStore(store).put(rec);
          tx.oncomplete=function(){res(true);};tx.onerror=function(){res(false);};});}
        function clear(db,store){return new Promise(function(res){
          var tx=db.transaction([store],'readwrite');tx.objectStore(store).clear();
          tx.oncomplete=function(){res(true);};tx.onerror=function(){res(false);};});}
        function count(db,store){return new Promise(function(res){
          var tx=db.transaction([store],'readonly');var q=tx.objectStore(store).count();
          q.onsuccess=function(e){res(e.target.result);};q.onerror=function(){res(-1);};});}
        function getAll(db,store){return new Promise(function(res){
          var tx=db.transaction([store],'readonly');var q=tx.objectStore(store).getAll();
          q.onsuccess=function(e){res(e.target.result||[]);};q.onerror=function(){res([]);};});}
        window.__t={openDB:openDB,put:put,clear:clear,count:count,getAll:getAll};

        var bin=atob(${JSON.stringify(PNG)});var u8=new Uint8Array(bin.length);
        for(var i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
        var blob=new Blob([u8],{type:'image/png'});

        // 錯題本
        localStorage.setItem(${JSON.stringify(NOTES_KEY)}, JSON.stringify([
          {date:'2026-10-01',subject:'數學',imageId:'wn1',content:'<p>錯題</p>',reasons:['粗心']}
        ]));
        var wn=await openDB(${JSON.stringify(WN_DB)},'images',{createdAt:1});
        await put(wn,'images',{id:'wn1',data:blob,createdAt:'2026-10-01T00:00:00Z'});
        // 模考卷圖片
        var me=await openDB(${JSON.stringify(ME_DB)},'mockExamImages',{examId:1});
        await put(me,'mockExamImages',{id:'img_m1',examId:'exam_1',data:'data:image/png;base64,${PNG}',createdAt:'2026-10-02T00:00:00Z'});
        // 模考複盤照片 (★ 有 examId / slot / name)
        var mr=await openDB(${JSON.stringify(MR_DB)},'mockExamReviewImages',{examId:1,slot:1});
        await put(mr,'mockExamReviewImages',{id:'rimg_1',examId:'exam_1',slot:0,data:'data:image/png;base64,${PNG}',name:'第1頁複盤.png',createdAt:'2026-10-03T00:00:00Z'});
        await put(mr,'mockExamReviewImages',{id:'rimg_2',examId:'exam_1',slot:1,data:'data:image/png;base64,${PNG}',name:'第2頁複盤.png',createdAt:'2026-10-03T00:00:00Z'});

        return { wn: await count(wn,'images'), me: await count(me,'mockExamImages'), mr: await count(mr,'mockExamReviewImages') };
      } catch(e){ return { err: e.message }; }
    })()`);
    ok(seeded && seeded.wn===1 && seeded.me===1 && seeded.mr===2, '3 個 DB 資料都造好了', JSON.stringify(seeded));

    console.log('\n▶ 步驟 2: diagnoseBackupCoverageAsync — 列出所有來源');
    const diag = await ev('(async function(){try{return await window.diagnoseBackupCoverageAsync();}catch(e){return{err:e.message};}})()');
    ok(diag && !diag.err, '診斷執行成功', diag && diag.err);
    ok(diag && diag.idbSources && diag.idbSources.length===3, '列出 3 個 IDB 來源', JSON.stringify(diag&&diag.idbSources&&diag.idbSources.map(x=>x.db)));
    const byDb = {};
    (diag && diag.idbSources || []).forEach(x => byDb[x.db] = x.count);
    ok(byDb[WN_DB]===1, '診斷: 錯題本圖片 1 張', JSON.stringify(byDb));
    ok(byDb[ME_DB]===1, '★ 診斷: 模考卷圖片 1 張', JSON.stringify(byDb));
    ok(byDb[MR_DB]===2, '★ 診斷: 模考複盤照片 2 張', JSON.stringify(byDb));
    ok(diag && diag.totalImages===4, '診斷: 圖片總數 4', 'total=' + (diag&&diag.totalImages));

    console.log('\n▶ 步驟 3: 產生備份 (app 真正的匯出邏輯)');
    const snap = await ev(`(async function(){
      try {
        var s = { _meta:{app:'StudyMap',schema:'full-v3',exportedAt:new Date().toISOString()}, keys:{}, idb:{} };
        for (var i=0;i<localStorage.length;i++){
          var k=localStorage.key(i);
          if(k && k.indexOf('StudyMap_')===0){var raw=localStorage.getItem(k);
            try{s.keys[k]=JSON.parse(raw);}catch(e){s.keys[k]=raw;}}
        }
        var notes = _v146ExportWrongNoteText();
        if(notes!=null) s.keys[${JSON.stringify(NOTES_KEY)}]=notes;
        for (var si=0; si<V147_IDB_SOURCES.length; si++){
          var src = V147_IDB_SOURCES[si];
          var recs = await _v147ExportIdbSource(src);
          if (recs.length) s.idb[src.db] = { store: src.store, records: recs };
        }
        s._meta.idbStats = V147_IDB_SOURCES.map(function(src){
          return { db:src.db, store:src.store, label:src.label, count:(s.idb[src.db]||{records:[]}).records.length }; });
        s._meta.totalImages = s._meta.idbStats.reduce(function(a,b){return a+b.count;},0);
        return s;
      } catch(e){ return { err:e.message }; }
    })()`);
    ok(snap && !snap.err, '備份產生成功', snap && snap.err);
    ok(snap && snap.idb && snap.idb[WN_DB] && snap.idb[WN_DB].records.length===1, '備份含錯題本圖片');
    ok(snap && snap.idb && snap.idb[ME_DB] && snap.idb[ME_DB].records.length===1, '★ 備份含模考卷圖片');
    ok(snap && snap.idb && snap.idb[MR_DB] && snap.idb[MR_DB].records.length===2, '★ 備份含模考複盤照片');
    const mrRec = snap && snap.idb && snap.idb[MR_DB] && snap.idb[MR_DB].records[0];
    ok(mrRec && mrRec.examId==='exam_1' && mrRec.slot===0 && mrRec.name==='第1頁複盤.png',
       '★ 複盤照片欄位完整 (examId/slot/name)', JSON.stringify(mrRec&&{e:mrRec.examId,s:mrRec.slot,n:mrRec.name}));
    ok(mrRec && mrRec._v147DataType==='dataurl', '複盤照片標記為 dataurl');
    const wnRec = snap && snap.idb && snap.idb[WN_DB] && snap.idb[WN_DB].records[0];
    ok(wnRec && wnRec._v147DataType==='blob', '★ 錯題本圖片標記為 blob (Blob→base64)');

    console.log('\n▶ 步驟 4: 清空全部 (模擬資料遺失)');
    const wiped = await ev(`(async function(){ try{
      var t = window.__t;
      localStorage.removeItem(${JSON.stringify(NOTES_KEY)});
      var wn=await t.openDB(${JSON.stringify(WN_DB)},'images',{});
      var me=await t.openDB(${JSON.stringify(ME_DB)},'mockExamImages',{});
      var mr=await t.openDB(${JSON.stringify(MR_DB)},'mockExamReviewImages',{});
      await t.clear(wn,'images'); await t.clear(me,'mockExamImages'); await t.clear(mr,'mockExamReviewImages');
      return { wn: await t.count(wn,'images'), me: await t.count(me,'mockExamImages'), mr: await t.count(mr,'mockExamReviewImages') };
    }catch(e){return{err:e.message};}})()`);
    ok(wiped && wiped.wn===0 && wiped.me===0 && wiped.mr===0, '全部清空', JSON.stringify(wiped));

    console.log('\n▶ 步驟 5: 還原');
    const restored = await ev(`(async function(){ try{
      var snap = ${JSON.stringify(snap)};
      var t = window.__t;
      var allowed=['${NOTES_KEY}'];
      var written=0;
      for (var k in snap.keys){
        if(typeof k!=='string') continue;
        if(k.indexOf('StudyMap_')!==0 && allowed.indexOf(k)===-1) continue;
        localStorage.setItem(k, JSON.stringify(snap.keys[k])); written++;
      }
      var stats=[];
      for (var si=0; si<V147_IDB_SOURCES.length; si++){
        var src=V147_IDB_SOURCES[si];
        var b=snap.idb[src.db]; if(!b||!Array.isArray(b.records)) continue;
        var n = await _v147RestoreIdbSource(src, b.records);
        stats.push({db:src.db,count:n});
      }
      var wn=await t.openDB(${JSON.stringify(WN_DB)},'images',{});
      var me=await t.openDB(${JSON.stringify(ME_DB)},'mockExamImages',{});
      var mr=await t.openDB(${JSON.stringify(MR_DB)},'mockExamReviewImages',{});
      return { written:written, stats:stats,
        wn: await t.count(wn,'images'), me: await t.count(me,'mockExamImages'), mr: await t.count(mr,'mockExamReviewImages'),
        mrRecs: await t.getAll(mr,'mockExamReviewImages'),
        meRecs: await t.getAll(me,'mockExamImages'),
        notes: JSON.parse(localStorage.getItem(${JSON.stringify(NOTES_KEY)})||'[]').length };
    }catch(e){return{err:e.message};}})()`);
    ok(restored && !restored.err, '還原執行成功', restored && restored.err);
    ok(restored && restored.wn===1, '★ 錯題本圖片還原', 'count='+(restored&&restored.wn));
    ok(restored && restored.me===1, '★ 模考卷圖片還原', 'count='+(restored&&restored.me));
    ok(restored && restored.mr===2, '★ 模考複盤照片還原', 'count='+(restored&&restored.mr));
    ok(restored && restored.notes===1, '★ 錯題本文字還原');
    const r0 = restored && restored.mrRecs && restored.mrRecs.find(x=>x.id==='rimg_1');
    ok(r0 && r0.examId==='exam_1' && r0.slot===0 && r0.name==='第1頁複盤.png',
       '★★ 複盤照片欄位完整還原 (examId/slot/name) — 接得回考卷', JSON.stringify(r0&&{e:r0.examId,s:r0.slot,n:r0.name}));
    ok(r0 && typeof r0.data==='string' && r0.data.indexOf('base64,')>0, '複盤照片 data 正確');
    const m0 = restored && restored.meRecs && restored.meRecs[0];
    ok(m0 && m0.examId==='exam_1', '★ 模考卷圖片 examId 欄位還原');

    console.log('\n▶ 步驟 6: 一鍵 backupEverything()');
    const one = await ev(`(async function(){ try{
      var r = await window.backupEverything();
      return { ok:true, json: r.json, disk: r.disk, errors: r.errors };
    }catch(e){ return { ok:false, err:e.message }; }})()`);
    ok(one && one.ok, 'backupEverything() 執行成功', one && (one.err||JSON.stringify(one.errors)));
    ok(one && one.json && one.json.schema==='full-v3', 'schema = full-v3', one && one.json && one.json.schema);
    ok(one && one.json && one.json.totalImages===4, '★ 圖片總數 4 全在備份裡', 'total='+(one&&one.json&&one.json.totalImages));
    ok(one && one.json && one.json.wrongNotes && one.json.wrongNotes.noteCount===1, '錯題本 1 筆在備份裡');
    ok(one && one.errors && one.errors.length===0, '沒有錯誤', JSON.stringify(one && one.errors));

    console.log('\n=== console 錯誤檢查 ===');
    const errs = logs.filter(l=>/EXCEPTION|error\|/.test(l));
    ok(errs.length===0, '沒有未捕捉的錯誤', errs.slice(0,3).join(' ;; '));

    console.log('\n'+'─'.repeat(50));
    console.log(`結果： ${pass} 通過 / ${fail} 失敗`);
    ws.close(); chrome.kill(); server.close();
    try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){}
    process.exit(fail?1:0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
