#!/usr/bin/env node
/**
 * 真實瀏覽器 e2e — 備份小工具 (v2.3.2.148)
 *
 * 驗證:
 *   ① Safari/Firefox 模式 (無 showDirectoryPicker) → 顯示備份小工具, 不是舊的 DiskDB banner
 *   ② Chrome 模式 (有 showDirectoryPicker) → 也顯示備份小工具
 *   ③ 小工具的「💾 備份所有資料」真的能打包全部資料
 *   ④ 舊的 DiskDB banner 不再出現
 */
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
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

async function runMode(label, removeFSA) {
    console.log('\n' + '═'.repeat(58));
    console.log(`▶▶▶ ${label}`);
    console.log('═'.repeat(58));

    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lpb-bw-'));
    const CHROME = ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(p=>fs.existsSync(p));
    const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage',
        '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--remote-allow-origins=*', 'about:blank'], { stdio:'ignore' });
    let ver=null;
    for (let i=0;i<120;i++){
        const pf=path.join(profile,'DevToolsActivePort');
        if (fs.existsSync(pf)){
            const port=parseInt(fs.readFileSync(pf,'utf8').split('\n')[0].trim(),10);
            if (port>0){ try{ ver=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; }catch(e){} }
        }
        await new Promise(r=>setTimeout(r,250));
    }
    if (!ver) { console.error('❌ Chrome 啟動失敗'); process.exit(1); }

    ws = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise(r=>ws.addEventListener('open',r));
    const logs=[];
    ws.addEventListener('message', ev=>{
        const m=JSON.parse(ev.data);
        if (m.id&&pending.has(m.id)){ const p=pending.get(m.id); pending.delete(m.id);
            m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result); }
        if (m.method==='Runtime.consoleAPICalled'){ const t=(m.params.args||[]).map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' '); logs.push(m.params.type+'| '+t); }
        if (m.method==='Runtime.exceptionThrown'){ const d=m.params.exceptionDetails; logs.push('EXCEPTION| '+(d.exception?.description||d.text)); }
    });
    const r = await send('Target.createTarget',{url:'about:blank'});
    const a = await send('Target.attachToTarget',{targetId:r.targetId,flatten:true});
    const sid = a.sessionId;
    await send('Page.enable',{},sid);
    await send('Runtime.enable',{},sid);

    if (removeFSA) {
        await send('Page.addScriptToEvaluateOnNewDocument',{source:`
            Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});
            Object.defineProperty(window,'showDirectoryPicker',{value:undefined,configurable:true});
        `},sid);
    }
    const ev = async x => {
        const rr = await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},sid);
        if (rr.exceptionDetails) return {__err: rr.exceptionDetails.exception?.description||rr.exceptionDetails.text};
        return rr.result.value;
    };
    await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/index.html?e2e=${Date.now()}`},sid);
    for (let i=0;i<80;i++){ await new Promise(r=>setTimeout(r,250));
        const rd=await ev("(function(){var t=document.getElementById('master-health-text');return !!(t&&(t.textContent||'').indexOf('檢查中')===-1);})()");
        if (rd) break; }
    await new Promise(r=>setTimeout(r,2500));

    console.log('\n▶ 檢查 UI');
    const ui = await ev(`(function(){
        var w=document.getElementById('backup-widget');
        return {
            widget: !!w,
            widgetText: w ? (w.textContent||'').replace(/\\s+/g,' ').trim().slice(0,140) : null,
            hasBackupBtn: !!(document.getElementById('bw-backup-btn')),
            hasSettingsBtn: !!(document.getElementById('bw-settings-btn')),
            oldUnsupported: !!document.getElementById('diskdb-unsupported-banner'),
            oldReady: !!document.getElementById('diskdb-ready-banner'),
            oldPicker: !!document.getElementById('diskdb-picker-banner')
        };
    })()`);
    ok(ui && ui.widget, '★ 備份小工具出現');
    ok(ui && ui.hasBackupBtn, '★ 有「💾 備份所有資料」按鈕');
    ok(ui && ui.hasSettingsBtn, '★ 有「⚙️ 設定」按鈕');
    ok(ui && ui.widgetText && ui.widgetText.indexOf('錯題本')>=0, '★ 說明文字提到錯題本(含圖片)', JSON.stringify(ui&&ui.widgetText));
    ok(ui && ui.widgetText && ui.widgetText.indexOf('模考')>=0, '★ 說明文字提到模考圖片');
    ok(ui && !ui.oldUnsupported, '★ 舊的「Safari/Firefox 模式」banner 不再出現');
    ok(ui && !ui.oldReady && !ui.oldPicker, '★ 其他舊 DiskDB banner 也沒出現');

    console.log('\n▶ 塞資料並測小工具的按鈕');
    await ev(`(async function(){
        localStorage.setItem('myStudyNotes', JSON.stringify([{date:'2026-10-01',subject:'數學',imageId:'wn1',content:'<p>x</p>'}]));
        function openDB(n,s){return new Promise(function(res,rej){var q=indexedDB.open(n,1);
          q.onupgradeneeded=function(e){var d=e.target.result;if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});};
          q.onsuccess=function(e){res(e.target.result);};q.onerror=function(){rej();};});}
        var mr=await openDB('mockExamReviewDB','mockExamReviewImages');
        await new Promise(function(res){var tx=mr.transaction(['mockExamReviewImages'],'readwrite');
          tx.objectStore('mockExamReviewImages').put({id:'r1',examId:'e1',slot:0,data:'data:image/png;base64,AAA',name:'n.png',createdAt:'2026-01-01'});
          tx.oncomplete=function(){res();};tx.onerror=function(){res();};});
        return true;})()`);

    const clicked = await ev(`(async function(){
        try{
            var captured=null;
            var origCreate=URL.createObjectURL;
            URL.createObjectURL=function(b){ if(b instanceof Blob) captured=b; return 'blob:x'; };
            var origClick=HTMLAnchorElement.prototype.click;
            var downloaded=false;
            HTMLAnchorElement.prototype.click=function(){ downloaded=true; };
            window.confirm=function(){return false;};
            var btn=document.getElementById('bw-backup-btn');
            if(!btn) return {err:'no button'};
            btn.click();
            for(var i=0;i<60;i++){ await new Promise(function(r){setTimeout(r,100);});
                var t=document.getElementById('backup-everything-toast');
                if(t && (t.textContent||'').indexOf('備份完成')>=0) break; }
            URL.createObjectURL=origCreate; HTMLAnchorElement.prototype.click=origClick;
            var toast=document.getElementById('backup-everything-toast');
            var txt = toast ? (toast.textContent||'') : '';
            var parsed=null;
            try{ parsed=JSON.parse(captured? (await captured.text()) : '{}'); }catch(e){}
            return { ok:true, toast: txt.replace(/\\s+/g,' ').slice(0,200), downloaded: downloaded,
                     hasBlob: captured instanceof Blob, size: captured?captured.size:0,
                     schema: parsed&&parsed._meta&&parsed._meta.schema,
                     totalImages: parsed&&parsed._meta&&parsed._meta.totalImages,
                     noteCount: parsed&&parsed._meta&&parsed._meta.wrongNotes&&parsed._meta.wrongNotes.noteCount };
        }catch(e){ return {ok:false,err:e.message}; }
    })()`);
    ok(clicked && clicked.ok, '★ 按下「備份所有資料」成功', clicked&&clicked.err);
    ok(clicked && clicked.hasBlob && clicked.size>100, '★ 產生可下載的備份檔', 'size='+(clicked&&clicked.size));
    ok(clicked && clicked.downloaded, '★ 觸發瀏覽器下載');
    ok(clicked && clicked.schema==='full-v3', '★ 備份 schema = full-v3', clicked&&clicked.schema);
    ok(clicked && clicked.totalImages===1, '★ 模考複盤照片 1 張有進去', 'total='+(clicked&&clicked.totalImages));
    ok(clicked && clicked.noteCount===1, '★ 錯題本 1 筆有進去');
    ok(clicked && clicked.toast && clicked.toast.indexOf('備份完成')>=0, '★ toast 顯示備份完成', JSON.stringify(clicked&&clicked.toast));

    console.log('\n▶ 關閉鈕');
    const closed = await ev(`(function(){
        var b=document.getElementById('bw-close-btn');
        if(!b) return {err:'no close btn'};
        b.click();
        return { gone: !document.getElementById('backup-widget'),
                 remembered: (function(){try{return sessionStorage.getItem('backup_widget_dismissed');}catch(e){return null;}})() };
    })()`);
    ok(closed && closed.gone, '★ 關閉鈕會隱藏小工具');
    ok(closed && closed.remembered==='1', '★ 關閉記住了 (同一個 session 不再打擾)');

    const errs = logs.filter(l=>/EXCEPTION|error\|/.test(l));
    ok(errs.length===0, '沒有未捕捉的錯誤', errs.slice(0,3).join(' ;; '));

    ws.close(); chrome.kill();
    try { fs.rmSync(profile,{recursive:true,force:true}); } catch(e){}
    await new Promise(r=>setTimeout(r,500));
}

(async()=>{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    PORT = server.address().port;
    await runMode('模式 A: Safari / Firefox (無 showDirectoryPicker)', true);
    await runMode('模式 B: Chrome (有 showDirectoryPicker)', false);

    console.log('\n'+'─'.repeat(58));
    console.log(`結果： ${pass} 通過 / ${fail} 失敗`);
    server.close();
    process.exit(fail?1:0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
