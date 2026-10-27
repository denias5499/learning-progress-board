#!/usr/bin/env node
/**
 * 真實瀏覽器 e2e — 備份小工具的「⚙️ 備份設定」跳轉 (v2.3.2.149)
 *
 * Denias 回報: 「右下角備份所有資料右邊有一個設定按鈕…按了沒動作?」
 *
 * 根因: v148 的按鈕只呼叫 openSettings() → 切到「⚙️ 教材庫與備份」頁
 *       但使用者最常見的情況是「本來就在那一頁」→ 再按一次畫面完全沒變 → 感覺是壞的
 *
 * v149 修法: 切頁 + 捲動到「⚠️ 全機資料備份與還原」區塊 + 短暫高亮 + toast
 *            → 不管人在哪, 一定有可見回饋
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

(async()=>{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const PORT = server.address().port;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(),'lpb-bsj-'));
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
    if (!ver){ console.error('❌ Chrome 啟動失敗'); process.exit(1); }
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
    const ev = async x => {
        const rr = await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true},sid);
        if (rr.exceptionDetails) return {__err: rr.exceptionDetails.exception?.description||rr.exceptionDetails.text};
        return rr.result.value;
    };
    await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/index.html?e2e=${Date.now()}`},sid);
    for (let i=0;i<80;i++){ await new Promise(r=>setTimeout(r,250));
        const rd=await ev("(function(){var t=document.getElementById('master-health-text');return !!(t&&(t.textContent||'').indexOf('檢查中')===-1);})()");
        if (rd) break; }
    await new Promise(r=>setTimeout(r,2000));

    // ────────────────────────────────────────────────────────────
    console.log('\n▶ 兩顆「備份所有資料」是同一顆？');
    const same = await ev(`(function(){
        var inPage = document.querySelector('#page-settings button[onclick*="backupEverything"]');
        var widget = document.getElementById('bw-backup-btn');
        return {
            hasPageBtn: !!inPage,
            hasWidgetBtn: !!widget,
            pageOnclick: inPage ? inPage.getAttribute('onclick') : null,
            sameGlobal: (typeof window.backupEverything === 'function'),
            widgetText: widget ? widget.textContent.trim() : null
        };
    })()`);
    ok(same && same.hasPageBtn, '設定頁有「💾 備份所有資料」按鈕');
    ok(same && same.pageOnclick && same.pageOnclick.indexOf('backupEverything')>=0, '設定頁按鈕呼叫 backupEverything()', JSON.stringify(same&&same.pageOnclick));
    ok(same && same.sameGlobal, 'window.backupEverything 是全域函式 (小工具呼叫的是同一個)');

    // 實際比對: 兩顆按鈕產生的備份內容是否一致
    const both = await ev(`(async function(){
        function grab(){
            return new Promise(function(resolve){
                var captured=null;
                var origCreate=URL.createObjectURL;
                URL.createObjectURL=function(b){ if(b instanceof Blob) captured=b; return 'blob:x'; };
                var origClick=HTMLAnchorElement.prototype.click;
                HTMLAnchorElement.prototype.click=function(){};
                window.confirm=function(){return false;};
                (function(){
                    var done=false;
                    var orig=window.backupEverything;
                    window.backupEverything=async function(){
                        var v=await orig.apply(this,arguments);
                        window.backupEverything=orig; done=true; return v;
                    };
                    setTimeout(function(){ if(!done){window.backupEverything=orig;} }, 10000);
                })();
                setTimeout(function(){
                    URL.createObjectURL=origCreate; HTMLAnchorElement.prototype.click=origClick;
                    resolve(captured);
                }, 3000);
            });
        }
        var widgetBtn=document.getElementById('bw-backup-btn');
        widgetBtn.click();
        var b1=await grab();
        // 設定頁那顆
        var inPage=document.querySelector('#page-settings button[onclick*="backupEverything"]');
        inPage.click();
        var b2=await grab();
        if(!b1||!b2) return {err:'no blob'};
        var t1=await b1.text(); var t2=await b2.text();
        var j1=JSON.parse(t1), j2=JSON.parse(t2);
        return { sameSchema: j1._meta.schema===j2._meta.schema, schema:j1._meta.schema,
                 sameLocal: JSON.stringify(j1.localStorage||{})===JSON.stringify(j2.localStorage||{}),
                 s1:(t1.length), s2:(t2.length) };
    })()`);
    ok(both && !both.err, '兩顆按鈕都能產生備份', JSON.stringify(both&&both.err));
    ok(both && both.sameSchema, '★ 兩顆的 schema 相同', JSON.stringify(both));
    ok(both && both.sameLocal, '★ 兩顆的 localStorage 內容完全相同 → 是同一個動作');

    // ────────────────────────────────────────────────────────────
    console.log('\n▶ 情境 A: 已經在「教材庫與備份」頁 (Denias 的情況)');
    await ev(`(function(){ showPage('page-settings'); window.scrollTo(0,0); })()`);
    await new Promise(r=>setTimeout(r,600));
    const scrolledBefore = await ev(`window.scrollY`);
    await ev(`document.getElementById('bw-settings-btn').click()`);
    await new Promise(r=>setTimeout(r,1400));
    const afterA = await ev(`(function(){
        var sec=document.getElementById('backup-section');
        var t=document.getElementById('backup-widget-toast');
        return {
            scrollY: Math.round(window.scrollY),
            secExists: !!sec,
            secBg: sec? sec.style.background : null,
            secInView: sec ? (function(){var r=sec.getBoundingClientRect(); return r.top<window.innerHeight && r.bottom>0;})() : false,
            toast: t? (t.textContent||'').trim() : null
        };
    })()`);
    ok(afterA && afterA.secExists, '★ 有 backup-section 區塊');
    ok(afterA && afterA.scrollY > scrolledBefore, '★ 頁面有捲動 (不是「沒動作」)', 'before='+scrolledBefore+' after='+(afterA&&afterA.scrollY));
    ok(afterA && afterA.secInView, '★ 備份區塊已捲進畫面');
    ok(afterA && afterA.secBg && afterA.secBg.replace(/\s+/g,'').indexOf('255,243,205')>=0, '★ 備份區塊有高亮反饋', JSON.stringify(afterA&&afterA.secBg));
    ok(afterA && afterA.toast && afterA.toast.indexOf('備份')>=0, '★ 有 toast 提示', JSON.stringify(afterA&&afterA.toast));

    // 高亮會消失
    await new Promise(r=>setTimeout(r,2400));
    const bgGone = await ev(`(function(){var s=document.getElementById('backup-section');return s?s.style.background:null;})()`);
    ok(bgGone==='' || bgGone==='rgba(0, 0, 0, 0)', '★ 高亮會自動消失 (不會一直黃)', JSON.stringify(bgGone));

    // ────────────────────────────────────────────────────────────
    console.log('\n▶ 情境 B: 在別的頁 (月曆)');
    await ev(`(function(){ showPage('page-planner'); window.scrollTo(0,0); })()`);
    await new Promise(r=>setTimeout(r,600));
    const pageBefore = await ev(`(function(){var v=[];document.querySelectorAll('.page-view').forEach(function(p){if(getComputedStyle(p).display!=='none')v.push(p.id);});return v;})()`);
    await ev(`document.getElementById('bw-settings-btn').click()`);
    await new Promise(r=>setTimeout(r,1400));
    const afterB = await ev(`(function(){
        var v=[];document.querySelectorAll('.page-view').forEach(function(p){if(getComputedStyle(p).display!=='none')v.push(p.id);});
        var sec=document.getElementById('backup-section');
        return { visible:v, secInView: sec ? (function(){var r=sec.getBoundingClientRect(); return r.top<window.innerHeight && r.bottom>0;})() : false };
    })()`);
    ok(pageBefore && pageBefore.indexOf('page-settings')<0, '★ 一開始不在設定頁', JSON.stringify(pageBefore));
    ok(afterB && afterB.visible && afterB.visible.indexOf('page-settings')>=0, '★ 切到設定頁了', JSON.stringify(afterB&&afterB.visible));
    ok(afterB && afterB.secInView, '★ 備份區塊有捲進畫面');

    console.log('\n▶ 按鈕文字');
    const label = await ev(`(function(){var b=document.getElementById('bw-settings-btn');return {txt:b?b.textContent.trim():null,title:b?b.title:null};})()`);
    ok(label && label.txt && label.txt.indexOf('備份設定')>=0, '★ 按鈕改成「⚙️ 備份設定」', JSON.stringify(label));
    ok(label && label.title && label.title.indexOf('備份區塊')>=0, '★ 有 tooltip 說明用途', JSON.stringify(label));

    const errs = logs.filter(l=>/EXCEPTION|error\|/.test(l));
    ok(errs.length===0, '沒有未捕捉的錯誤', errs.slice(0,3).join(' ;; '));

    console.log('\n'+'─'.repeat(58));
    console.log(`結果： ${pass} 通過 / ${fail} 失敗`);
    ws.close(); chrome.kill(); server.close();
    try { fs.rmSync(profile,{recursive:true,force:true}); } catch(e){}
    process.exit(fail?1:0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
