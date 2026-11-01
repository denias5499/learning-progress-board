const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const text=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
async function setup(t){
 const dom=new JSDOM(text('calendar-print-view.html'),{url:'https://example.test/calendar-print-view.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});const w=dom.window;t.after(()=>w.close());
 const messages=[];w.opener={closed:false,postMessage:data=>messages.push(data),focus(){}};w.focus=()=>{};
 w.URL.createObjectURL=()=> 'blob:https://example.test/pdf';w.URL.revokeObjectURL=()=>{};
 Object.defineProperty(w.HTMLImageElement.prototype,'naturalWidth',{get:()=>2526});w.HTMLImageElement.prototype.decode=()=>Promise.resolve();w.requestAnimationFrame=cb=>w.setTimeout(cb,0);
 const children=[];w.open=()=>{const events={};const child={closed:false,document:{contentType:'application/pdf',readyState:'complete'},focus(){},close(){this.closed=true;},addEventListener:(name,fn)=>events[name]=fn,print(){w.print();w.setTimeout(()=>events.afterprint?.(),0);}};children.push(child);return child;};
 return {w,messages,children,send:data=>w.dispatchEvent(new w.MessageEvent('message',{data,source:w.opener,origin:'https://example.test'}))};
}
const result={bytes:new Uint8Array([1]),images:['data:image/jpeg;base64,AA==','data:image/jpeg;base64,AA=='],pages:2,weeks:3,tasks:9};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(check){const until=Date.now()+5000;while(!check()){if(Date.now()>until)throw Error('UI did not settle');await pause(10);}}
test('先完整顯示預覽而不自動遮住畫面，確認列印後仍保留，可縮放、儲存與重印',async t=>{
 const {w,messages,children,send}=await setup(t);let resolveDecode,decodes=0,prints=0,builds=0;
 const decode=new Promise(r=>resolveDecode=r);w.HTMLImageElement.prototype.decode=()=>{decodes++;return decode;};
 w.CalendarPrintPDF={create:async()=>{builds++;return result;}};w.print=()=>{assert.equal(w.document.querySelectorAll('.preview-sheet img').length,2);assert.equal(decodes,2);prints++;};w.eval(text('calendar-print-view.js'));
 assert.equal(messages[0].kind,'lpb-print-ready');send({kind:'lpb-print-job',model:{},options:{},name:'甲學生'});await waitFor(()=>decodes>0);assert.equal(prints,0);assert.equal(w.document.querySelector('#preview-print').disabled,true);
 resolveDecode();await waitFor(()=>messages.some(m=>m.kind==='lpb-print-preview-ready'));assert.equal(prints,0);assert.ok(messages.some(m=>m.kind==='lpb-print-preview-ready'));assert.equal(w.location.pathname,'/calendar-print-view.html');assert.match(w.document.querySelector('#print-status').textContent,/甲學生/);assert.equal(w.document.querySelector('#preview-download').hidden,false);
 w.document.querySelector('#preview-print').click();await waitFor(()=>prints===1&&children[0].closed);assert.equal(prints,1);assert.equal(children[0].closed,true);assert.match(w.document.querySelector('#print-status').textContent,/預覽已保留/);assert.equal(w.document.querySelectorAll('.preview-sheet').length,2);
 const before=w.document.querySelector('#preview-pages').style.getPropertyValue('--preview-width');w.document.querySelector('#preview-plus').click();assert.notEqual(w.document.querySelector('#preview-pages').style.getPropertyValue('--preview-width'),before);
 w.document.querySelector('#preview-print').click();await waitFor(()=>prints===2&&children[1].closed);assert.equal(prints,2);assert.equal(builds,1);
 const key=new w.KeyboardEvent('keydown',{key:'p',metaKey:true,cancelable:true});w.dispatchEvent(key);await waitFor(()=>prints===3);assert.equal(key.defaultPrevented,true);assert.equal(prints,3);
});
test('預覽圖片失敗時不列印、有錯誤與重試；成功重試保留同一份快照',async t=>{
 const {w,messages,send}=await setup(t);let broken=true,builds=0,prints=0;const model={id:'original'};
 w.CalendarPrintPDF={create:async m=>{assert.equal(m,model);builds++;return result;}};w.HTMLImageElement.prototype.decode=()=>broken?Promise.reject(Error('圖片失敗')):Promise.resolve();w.print=()=>prints++;w.eval(text('calendar-print-view.js'));
 send({kind:'lpb-print-job',model,options:{}});await waitFor(()=>messages.some(m=>m.kind==='lpb-print-failed'));assert.equal(prints,0);assert.equal(w.document.querySelector('#preview-retry').hidden,false);assert.match(w.document.querySelector('#print-status').textContent,/圖片失敗/);assert.ok(messages.some(m=>m.kind==='lpb-print-failed'));
 broken=false;w.document.querySelector('#preview-retry').click();await waitFor(()=>!w.document.querySelector('#preview-print').disabled);assert.equal(builds,2);assert.equal(prints,0);assert.equal(w.document.querySelector('#preview-print').disabled,false);w.document.querySelector('#preview-print').click();await waitFor(()=>prints===1);assert.equal(prints,1);
});
test('PDF視窗被擋或載入逾時不會清空預覽，仍可儲存與重新列印',async t=>{
 const {w,send}=await setup(t);let prints=0;w.CalendarPrintPDF={create:async()=>result};w.print=()=>prints++;const open=w.open;w.eval(text('calendar-print-view.js'));send({kind:'lpb-print-job',model:{},options:{}});await waitFor(()=>!w.document.querySelector('#preview-print').disabled);
 w.open=()=>null;w.document.querySelector('#preview-print').click();assert.match(w.document.querySelector('#print-status').textContent,/瀏覽器未開啟列印視窗/);assert.equal(w.document.querySelectorAll('.preview-sheet img').length,2);assert.equal(w.document.querySelector('#preview-print').disabled,false);
 let tick=0;w.Date.now=()=>tick+=20000;w.open=()=>({closed:false,focus(){},close(){this.closed=true;},document:{contentType:'text/html',readyState:'loading'}});w.document.querySelector('#preview-print').click();await waitFor(()=>w.document.querySelector('#print-status').textContent.includes('系統列印尚未載入'));assert.match(w.document.querySelector('#print-status').textContent,/系統列印尚未載入/);assert.equal(prints,0);assert.equal(w.document.querySelector('#preview-print').disabled,false);assert.equal(w.document.querySelector('#preview-download').hidden,false);
 w.open=open;w.document.querySelector('#preview-print').click();await waitFor(()=>prints===1);assert.equal(prints,1);assert.equal(w.document.querySelectorAll('.preview-sheet').length,2);
});
